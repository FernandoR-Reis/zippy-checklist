import { redirect } from "next/navigation";

// A raiz apenas encaminha: o middleware decide entre /hoje (logado)
// e /login (não logado).
export default function RootPage() {
  redirect("/login");
}
