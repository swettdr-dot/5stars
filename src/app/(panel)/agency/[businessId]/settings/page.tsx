import { notFound } from "next/navigation";
import { resolveManageableBusiness } from "@/lib/business-access";
import { BusinessTabs } from "../_components/BusinessTabs";
import { SettingsForm } from "@/app/(panel)/business/settings/_components/SettingsForm";

export default async function AgencySettingsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const business = await resolveManageableBusiness(businessId).catch(() => null);
  if (!business) notFound();

  return (
    <div className="max-w-[680px]">
      <BusinessTabs businessId={businessId} businessName={business.name} active="settings" />
      <SettingsForm
        businessId={businessId}
        canEdit
        defaults={{
          googleReviewUrl: business.googleReviewUrl,
          logoUrl: business.logoUrl ?? "",
          starThreshold: business.starThreshold,
        }}
      />
    </div>
  );
}
