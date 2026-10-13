import { redirect } from "next/navigation";

export default function Page() {
  // ARTSS ONE is the single user-facing workspace. Eve's authenticated
  // conversation interface is retained at /legacy for existing sessions.
  redirect("https://artssapp-agent-artssby-apps.vercel.app/");
}
