import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
import { useRegister, useCreateOrganization } from "@workspace/api-client-react";
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

export default function RegisterPage() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { login: authenticate } = useAuth();
  const { toast } = useToast();

  const registerSchema = z.object({
    name: z.string().min(2, t("register.errorName")),
    email: z.string().email(t("register.errorEmail")),
    password: z.string().min(8, t("register.errorPassword")),
    orgName: z.string().min(2, t("register.errorOrg")),
  });

  const registerMutation = useRegister();
  const createOrgMutation = useCreateOrganization();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      orgName: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    try {
      registerMutation.mutate(
        { data: { name: values.name, email: values.email, password: values.password } },
        {
          onSuccess: (authData) => {
            authenticate(authData.token, authData.user);

            createOrgMutation.mutate(
              { data: { name: values.orgName, currency: "USD" } },
              {
                onSuccess: () => {
                  toast({
                    title: t("register.toastSuccess.title"),
                    description: t("register.toastSuccess.description"),
                  });
                  setLocation("/dashboard");
                },
                onError: () => {
                  toast({
                    title: t("register.toastPartial.title"),
                    description: t("register.toastPartial.description"),
                  });
                  setLocation("/dashboard");
                }
              }
            );
          },
          onError: (error: any) => {
            toast({
              variant: "destructive",
              title: t("register.toastError.title"),
              description: error?.data?.error || error?.message || t("register.toastError.description"),
            });
          },
        }
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight uppercase">{t("register.title")}</h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm uppercase tracking-widest">
            {t("register.subtitle")}
          </p>
        </div>

        <div className="bg-card p-8 rounded-xl border border-border shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="orgName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">{t("register.orgLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("register.orgPlaceholder")} {...field} className="font-mono bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">{t("register.nameLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("register.namePlaceholder")} {...field} className="font-mono bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">{t("register.emailLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("register.emailPlaceholder")} {...field} className="font-mono bg-background" />
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
                    <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">{t("register.passwordLabel")}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} className="font-mono bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full uppercase tracking-wider font-bold mt-6"
                disabled={registerMutation.isPending || createOrgMutation.isPending}
              >
                {registerMutation.isPending || createOrgMutation.isPending ? t("register.submitPending") : t("register.submit")}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t("register.footer")}</span>{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              {t("register.footerLink")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
