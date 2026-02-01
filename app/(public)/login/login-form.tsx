"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const loginSchema = z.object({
    password: z.string().min(1, "Password is required"),
});

export default function LoginForm() {
    const router = useRouter();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof loginSchema>) {
        const { success, error } = await signIn(values.password);

        if (error) {
            toast.error(error);
            return;
        }

        if (success) {
            setIsRedirecting(true);
            toast.success("Logged in successfully");
            router.push("/dashboard");
        }
    }

    const isDisabled = form.formState.isSubmitting || isRedirecting;

    return (
        <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center gap-2 mb-6">
                    <Link href="/" className="flex flex-col items-center gap-2 font-medium">
                        <div className="flex size-12 items-center justify-center">
                            <Image
                                src="/icon.svg"
                                alt="StreamUI"
                                width={48}
                                height={48}
                                className="invert dark:invert-0"
                            />
                        </div>
                        <span className="sr-only">StreamUI</span>
                    </Link>
                    <h1 className="text-xl font-bold">Welcome Back</h1>
                    <p className="text-sm text-muted-foreground text-center">Enter your password to continue</p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                        <div className="flex flex-col gap-6">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="Enter your password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" disabled={isDisabled}>
                                {isDisabled ? "Signing in..." : "Sign In"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}
