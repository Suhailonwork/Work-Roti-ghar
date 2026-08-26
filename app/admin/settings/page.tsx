import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { getOrgSettings, getSeoDefaults, getSetting, getSupportSettings } from '@/lib/cms/queries';
import {
  OrgSettingsForm,
  PointsRulesForm,
  SeoDefaultsForm,
  SupportSettingsForm,
} from '@/components/admin/SettingsForms';
import { Card, CardBody, CardHeader, CardTitle, SectionHeading } from '@/components/ui';
import { buildStaticMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticMetadata({ title: 'Settings', path: '/admin/settings', noIndex: true });
}

interface PointsRules {
  distribution: number;
  verified_contribution: number;
  post: number;
  volunteer_day: number;
}

export default async function SettingsPage() {
  await requireAdmin();

  const [org, seoDefaults, support, pointsRules] = await Promise.all([
    getOrgSettings(),
    getSeoDefaults(),
    getSupportSettings(),
    getSetting<Partial<PointsRules>>('points_rules'),
  ]);

  const rules: PointsRules = {
    distribution: pointsRules?.distribution ?? 10,
    verified_contribution: pointsRules?.verified_contribution ?? 5,
    post: pointsRules?.post ?? 1,
    volunteer_day: pointsRules?.volunteer_day ?? 15,
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Settings"
        description="Organisation details, default metadata, funding policy and how points are earned."
      />

      <Card>
        <CardHeader>
          <CardTitle>Organisation</CardTitle>
          <p className="mt-1 text-sm text-clay-600">Shown in the footer and on the public pages.</p>
        </CardHeader>
        <CardBody>
          <OrgSettingsForm org={org} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Support &amp; funding policy</CardTitle>
          <p className="mt-1 text-sm text-clay-600">
            Controls what the public Support page offers, and the statement shown site-wide.
          </p>
        </CardHeader>
        <CardBody>
          <SupportSettingsForm support={support} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default SEO</CardTitle>
        </CardHeader>
        <CardBody>
          <SeoDefaultsForm defaults={seoDefaults} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Points</CardTitle>
        </CardHeader>
        <CardBody>
          <PointsRulesForm rules={rules} />
        </CardBody>
      </Card>
    </div>
  );
}
