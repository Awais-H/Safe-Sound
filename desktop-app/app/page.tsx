import Dashboard from "./components/dashboard"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-101 flex items-center justify-center p-4">
      <div className="shadow-2xl rounded-lg overflow-hidden">
        <Dashboard />
      </div>
    </div>
  )
}
