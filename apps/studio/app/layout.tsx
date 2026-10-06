import type {Metadata} from "next";
import "./globals.css";

export const metadata:Metadata={
  title:"Leruchi Graph Studio",
  description:"Explore relational and graph data through Leruchi contracts."
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
