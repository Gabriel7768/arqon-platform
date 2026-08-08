import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { login: authenticate } = useAuth();
  const { toast } = useToast();

  const loginSchema = z.object({
    email: z.string().email(t("login.errorEmail")),
    password: z.string().min(8, t("login.errorPassword")),
  });

  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          authenticate(data.token, data.user);
          toast({
            title: t("login.toastSuccess.title"),
            description: t("login.toastSuccess.description"),
          });
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: t("login.toastError.title"),
            description: error?.data?.error || error?.message || t("login.toastError.description"),
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight uppercase">{t("login.title")}</h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm uppercase tracking-widest">
            {t("login.subtitle")}
          </p>
        </div>

        <div className="bg-card p-8 rounded-xl border border-border shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">{t("login.emailLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("login.emailPlaceholder")} {...field} className="font-mono bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">{t("login.passwordLabel")}</FormLabel>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} className="font-mono bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full uppercase tracking-wider font-bold"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? t("login.submitPending") : t("login.submit")}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t("login.footer")}</span>{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              {t("login.footerLink")}
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground/50 font-mono">
          {t("login.footerSecure")}
        </div>
      </div>
    </div>
  );
}
