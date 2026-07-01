import React, { Component, ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", color: "#ef4444", backgroundColor: "#09090b", minHeight: "100vh", fontFamily: "monospace" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px" }}>Application Render Error:</h2>
          <pre style={{ backgroundColor: "#18181b", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", overflowX: "auto" }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ marginTop: "16px", color: "#a1a1aa", fontSize: "12px", overflowX: "auto" }}>
            {this.state.error?.stack}
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
