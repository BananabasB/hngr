import { Button } from "@/components/ui/button";
import { Mailbox, MailOpen } from "lucide-react";
import React from "react";

// --- OpenEmailsButton and getEmailProviderLink ---
export function getEmailProviderLink(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  if (domain.includes("gmail")) return "https://mail.google.com";
  if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live"))
    return "https://outlook.live.com/mail";
  if (domain.includes("yahoo")) return "https://mail.yahoo.com";
  if (domain.includes("icloud") || domain.includes("me.com"))
    return "https://www.icloud.com/mail";
  return null;
}

export function OpenEmailsButton({ email }: { email: string }) {
  const [showMenu, setShowMenu] = React.useState(false);
  const link = getEmailProviderLink(email);

  const getProviderName = (email: string): string => {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return "emails";
    if (domain.includes("gmail")) return "gmail";
    if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live")) return "outlook";
    if (domain.includes("yahoo")) return "yahoo";
    if (domain.includes("icloud") || domain.includes("me.com")) return "icloud mail";
    return "emails";
  };

  const providerName = getProviderName(email);

  const handleClick = () => {
    if (link) {
      window.open(link, "_blank");
    } else {
      setShowMenu(true);
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      <Button variant="ghost" type="button" onClick={handleClick}>
        <Mailbox />
        open {providerName}
      </Button>

      {showMenu && (
        <div className="absolute top-full mt-2 bg-white border rounded shadow-lg z-10 text-sm">
          <ul className="py-1">
            <li>
              <a href="https://mail.google.com" target="_blank" className="block px-4 py-2 hover:bg-gray-100">
                Gmail
              </a>
            </li>
            <li>
              <a href="https://outlook.live.com/mail" target="_blank" className="block px-4 py-2 hover:bg-gray-100">
                Outlook
              </a>
            </li>
            <li>
              <a href="https://mail.yahoo.com" target="_blank" className="block px-4 py-2 hover:bg-gray-100">
                Yahoo
              </a>
            </li>
            <li>
              <a href="https://www.icloud.com/mail" target="_blank" className="block px-4 py-2 hover:bg-gray-100">
                iCloud Mail
              </a>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}