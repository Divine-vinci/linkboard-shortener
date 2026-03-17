import { ResetPasswordPage } from "@/components/auth/reset-password-page";

type ResetPasswordRoutePageProps = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordRoutePage({
  searchParams,
}: ResetPasswordRoutePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return <ResetPasswordPage token={resolvedSearchParams?.token} />;
}
