import {createHash} from "node:crypto";

export const GRAPH_EVENT_CHANNEL = "vibe_graph_events";

export function topicFor({tenantId,graph}){
  if(!tenantId||!graph)throw new Error("tenantId and graph are required");
  const tenantKey=createHash("sha256").update(tenantId).digest("hex").slice(0,20);
  return "graph:"+tenantKey+":"+graph;
}

export function authorizeSubscription({context,graph,catalog}){
  if(context?.trusted!==true||typeof context.tenantId!=="string"||!context.tenantId){
    return {ok:false,code:"UNTRUSTED_CONTEXT"};
  }
  const definition=catalog?.graphs?.[graph];
  if(!definition)return {ok:false,code:"GRAPH_NOT_FOUND"};
  if(definition.visibility==="tenant"&&definition.tenantId!==context.tenantId){
    return {ok:false,code:"GRAPH_FORBIDDEN"};
  }
  return {ok:true,topic:topicFor({tenantId:context.tenantId,graph})};
}

export function toClientEvent(row){
  return {
    version:"v1",
    event_id:row.event_id,
    event_seq:row.event_seq,
    event_type:row.event_type,
    graph:row.graph_name,
    operation:row.operation,
    target:{kind:row.target_kind,label:row.target_label,id:String(row.target_id)},
    occurred_at:row.occurred_at
  };
}

export async function claimBatch(db,{workerId,limit=100}={}){
  if(!workerId)throw new Error("workerId is required");
  const size=Math.max(1,Math.min(500,Number(limit)||100));
  await db.query("BEGIN");
  try{
    const result=await db.query(
      `WITH candidates AS (
         SELECT event_seq
           FROM vibe_meta.graph_event_outbox
          WHERE published_at IS NULL
            AND available_at <= now()
            AND (claimed_at IS NULL OR claimed_at < now() - interval '30 seconds')
          ORDER BY event_seq
          FOR UPDATE SKIP LOCKED
          LIMIT $1
       )
       UPDATE vibe_meta.graph_event_outbox e
          SET claimed_by=$2, claimed_at=now(), attempts=e.attempts+1
         FROM candidates c
        WHERE e.event_seq=c.event_seq
       RETURNING e.*`,
      [size,workerId]
    );
    await db.query("COMMIT");
    return result.rows;
  }catch(error){
    await db.query("ROLLBACK");
    throw error;
  }
}

export async function markPublished(db,{eventSeq,workerId}){
  const result=await db.query(
    `UPDATE vibe_meta.graph_event_outbox
        SET published_at=now(), claimed_by=NULL, claimed_at=NULL, last_error=NULL
      WHERE event_seq=$1 AND claimed_by=$2 AND published_at IS NULL
      RETURNING event_seq`,
    [eventSeq,workerId]
  );
  return result.rowCount===1;
}

export async function markFailed(db,{eventSeq,workerId,error,backoffSeconds=5}){
  const safe=String(error?.message||error||"realtime publish failed").slice(0,1000);
  const result=await db.query(
    `UPDATE vibe_meta.graph_event_outbox
        SET available_at=now()+($3::text || ' seconds')::interval,
            claimed_by=NULL, claimed_at=NULL, last_error=$4
      WHERE event_seq=$1 AND claimed_by=$2 AND published_at IS NULL
      RETURNING event_seq`,
    [eventSeq,workerId,Math.max(1,Math.min(300,Number(backoffSeconds)||5)),safe]
  );
  return result.rowCount===1;
}

export async function readEvent(db,eventId){
  const result=await db.query(
    `SELECT event_seq,event_id,event_type,graph_name,operation,target_kind,target_label,target_id,occurred_at,tenant_id
       FROM vibe_meta.graph_event_outbox
      WHERE event_id=$1`,
    [eventId]
  );
  return result.rows[0]??null;
}

export async function replayTenantGraph(db,{tenantId,graph,afterEventSeq=0,limit=100}){
  const size=Math.max(1,Math.min(500,Number(limit)||100));
  const result=await db.query(
    `SELECT event_seq,event_id,event_type,graph_name,operation,target_kind,target_label,target_id,occurred_at
       FROM vibe_meta.graph_event_outbox
      WHERE tenant_id=$1 AND graph_name=$2 AND event_seq>$3
      ORDER BY event_seq
      LIMIT $4`,
    [tenantId,graph,Number(afterEventSeq)||0,size]
  );
  return result.rows.map(toClientEvent);
}

export async function listenForWakeups(client,onEventId){
  await client.query("LISTEN "+GRAPH_EVENT_CHANNEL);
  const handler=message=>{
    if(message.channel===GRAPH_EVENT_CHANNEL&&message.payload)onEventId(message.payload);
  };
  client.on("notification",handler);
  return ()=>client.off("notification",handler);
}
