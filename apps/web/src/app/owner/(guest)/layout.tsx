export default function OwnerGuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">Platform Owner Console</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
