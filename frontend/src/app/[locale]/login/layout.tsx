/**
 * Login page layout — no sidebar, standalone full-screen view.
 */

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex-1">
            {children}
        </div>
    );
}
