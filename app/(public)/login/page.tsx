import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";

export default async function LoginPage() {
    const session = await getSession();

    if (session) {
        redirect("/dashboard");
    }

    return <LoginForm />;
}
