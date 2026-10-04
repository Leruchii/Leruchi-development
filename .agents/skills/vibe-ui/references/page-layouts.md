# Vibe UI Page Layouts

Graph Studio uses Type C — Canvas.

Type C rules:
- canvas pages fill available viewport height;
- do not wrap the workspace in a normal max-width content container;
- use fixed proportional workspace regions with responsive collapse;
- 1440px desktop target: 20% navigation/steps, 55% working canvas/results, 25% inspector;
- 768px tablet: collapse secondary chrome before shrinking the primary workspace;
- 360px mobile: preserve primary graph/result interaction and move inspector/sidebar into accessible overlays.

Shared application shell:
skip link → header → project switcher/breadcrumbs → command/search → theme/account controls → icon rail → Graph Studio section navigation → workspace.

Use consistent spacing tokens and container queries. Avoid arbitrary pixel values.
