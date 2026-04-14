# Scenario Run Log

- Scenario ID: S04
- Scenario Name: User deploys selected agents from Universal Deploy
- Attempt: 3
- Operator: Codex
- Start Time: 2026-04-13T21:37:00.530Z
- End Time: 2026-04-13T21:37:06.293Z
- Result: failed

## Action Log

1. Open 01Deck home
2. Continue as guest through auth gate
3. Skip onboarding overlay
4. Navigate to Deploy workspace

## Timestamps

- app loaded: 2026-04-13T21:37:01.617Z
- first action: 2026-04-13T21:37:05.390Z
- first visible value: n/a
- completion: n/a
- friction point: none observed in this capture

## Screenshots

- screenshots/01-home.png
- screenshots/02-deploy-workspace.png
- screenshots/03-selected-agents.png
- screenshots/04-command-and-payload.png

## Errors

- console:Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()?%s%s 

Check the render method of `PopChild`. 
    at AgentBar (http://127.0.0.1:4173/src/app/components/AgentBar.tsx:35:28)
    at PopChildMeasure (http://127.0.0.1:4173/node_modules/.vite/deps/motion_react.js?v=3244ed1e:8021:23)
    at PopChild (http://127.0.0.1:4173/node_modules/.vite/deps/motion_react.js?v=3244ed1e:8048:21)
    at PresenceChild (http://127.0.0.1:4173/node_modules/.vite/deps/motion_react.js?v=3244ed1e:8098:24)
    at AnimatePresence (http://127.0.0.1:4173/node_modules/.vite/deps/motion_react.js?v=3244ed1e:8175:26)
    at div
    at div
    at AgentList (http://127.0.0.1:4173/src/app/components/AgentList.tsx:25:125)
    at main
    at div
    at AppContent (http://127.0.0.1:4173/src/app/App.tsx:50:7)
    at AppProvider (http://127.0.0.1:4173/src/app/context/AppContext.tsx:346:31)
    at DndProvider2 (http://127.0.0.1:4173/node_modules/.vite/deps/react-dnd.js?v=3244ed1e:1505:9)
    at App
    at AppRoot (http://127.0.0.1:4173/src/main.tsx:30:31)
    at AuthProvider (http://127.0.0.1:4173/src/app/context/AuthContext.tsx:65:32)
- console:Failed to load resource: net::ERR_CONNECTION_REFUSED
- console:Failed to load resource: net::ERR_CONNECTION_REFUSED

## Notes

- Selected agent cards: not captured
- Visible value: not reached
- Video: /run/media/Ryan/01D6C62CA8BDCCC0/code/working/01Deck/test_ads/artifacts/S04-universal-deploy-attempt-03/video/page@1fd72dd760026eebd6097ce1075a33dc.webm
