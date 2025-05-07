// app/layout.js
import '../src/index.css'
import '../src/App.css'

export const metadata = {
  title: 'PREDIK Dashboard',
  description: 'Cryptocurrency prediction and staking platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}