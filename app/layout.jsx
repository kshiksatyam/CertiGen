import './globals.css';

export const metadata = {
  title: 'CertiGen',
  description: 'Certificate Generation System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
