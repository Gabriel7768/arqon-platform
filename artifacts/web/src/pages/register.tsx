import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
import { useRegister, useCreateOrganization } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
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
import { useState } from "react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  orgName: z.string().min(2, "Organization name must be at least 2 characters"),
});

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { login: authenticate } = useAuth();
  const { toast } = useToast();
  
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
      // 1. Register User
      registerMutation.mutate(
        { data: { name: values.name, email: values.email, password: values.password } },
        {
          onSuccess: (authData) => {
            // After auth, set token temporarily for the next request
            authenticate(authData.token, authData.user);
            
            // 2. Create Organization
            createOrgMutation.mutate(
              { data: { name: values.orgName, currency: "USD" } },
              {
                onSuccess: () => {
                  toast({
                    title: "Instance Deployed",
                    description: "ARQON Engine is ready for data ingestion.",
                  });
                  setLocation("/dashboard");
                },
                onError: () => {
                  toast({
                    title: "Registration successful, but org creation failed",
                    description: "You may need to create an organization in settings.",
                  });
                  setLocation("/dashboard");
                }
              }
            );
          },
          onError: (error: any) => {
            toast({
              variant: "destructive",
              title: "Deployment failed",
              description: error?.data?.error || error?.message || "Could not register user",
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
          <h1 className="text-3xl font-bold tracking-tight uppercase">Deploy Instance</h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm uppercase tracking-widest">
            Initialize Engine Context
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
                    <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">Entity Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} className="font-mono bg-background" />
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
                    <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">Admin Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} className="font-mono bg-background" />
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
                    <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">Admin Email</FormLabel>
                    <FormControl>
                      <Input placeholder="jane@company.com" {...field} className="font-mono bg-background" />
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
                    <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">Access Key</FormLabel>
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
                {registerMutation.isPending || createOrgMutation.isPending ? "Deploying..." : "Initialize"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Context exists?</span>{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Authenticate
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
