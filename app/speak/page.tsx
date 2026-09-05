import { redirect } from "next/navigation";

/**
 * Text Mode and Speak Mode were the same screen with a mic button. They're now
 * one unified view at `/`; this route stays as a redirect for old links/bookmarks.
 */
export default function SpeakPage() {
  redirect("/");
}
