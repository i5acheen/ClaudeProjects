import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { ControlCategory, ControlStatusValue, EvidenceType } from "../src/lib/types";

const prisma = new PrismaClient();

const CONTROLS: {
  code: string;
  title: string;
  description: string;
  category: ControlCategory;
}[] = [
  {
    code: "PPL-01",
    title: "Background checks completed before start date",
    description:
      "A background check is initiated and completed for every new hire before their first day of system access.",
    category: "ONBOARDING",
  },
  {
    code: "PPL-02",
    title: "Confidentiality/NDA agreement signed before system access is granted",
    description:
      "Every new hire and contractor signs a confidentiality or NDA agreement before any company systems or data are made available to them.",
    category: "ONBOARDING",
  },
  {
    code: "PPL-03",
    title: "Employee handbook & code of conduct acknowledged at hire",
    description:
      "New hires read and acknowledge the employee handbook and code of conduct as part of onboarding.",
    category: "ONBOARDING",
  },
  {
    code: "PPL-04",
    title: "System access provisioned per documented role (least privilege)",
    description:
      "Access to company systems is granted at onboarding according to a documented role/permission mapping, not on an ad hoc basis.",
    category: "ONBOARDING",
  },
  {
    code: "PPL-05",
    title: "Access revoked within 24 hours of termination",
    description:
      "All system access for a departing employee or contractor is disabled within 24 hours of their termination date.",
    category: "OFFBOARDING",
  },
  {
    code: "PPL-06",
    title: "Company assets returned and accounts disabled at offboarding",
    description:
      "Company-owned devices and physical assets are returned and all accounts are disabled as part of the offboarding checklist.",
    category: "OFFBOARDING",
  },
  {
    code: "PPL-07",
    title: "Annual security awareness training completed and logged",
    description:
      "All employees complete security awareness training at least once every 12 months, and completion is logged.",
    category: "TRAINING",
  },
  {
    code: "PPL-08",
    title: "Acceptable Use Policy acknowledged annually",
    description:
      "All employees re-acknowledge the Acceptable Use Policy at least once every 12 months.",
    category: "POLICY",
  },
  {
    code: "PPL-09",
    title: "Quarterly user access review performed for critical systems",
    description:
      "Access lists for critical systems (production infrastructure, customer data stores, source control) are reviewed at least once per quarter, with any excess access removed.",
    category: "ACCESS_REVIEW",
  },
  {
    code: "PPL-10",
    title: "Access updated within a defined SLA on role change",
    description:
      "When an employee changes role internally, their system access is reviewed and updated to match the new role within a defined SLA.",
    category: "ACCESS_REVIEW",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("ComplyTrail123!", 10);

  const company = await prisma.company.upsert({
    where: { id: "seed-company-aurora" },
    update: {},
    create: {
      id: "seed-company-aurora",
      name: "Aurora Robotics, Inc.",
      auditDate: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
    },
  });

  const [priya, marcus, dana] = await Promise.all([
    prisma.user.upsert({
      where: { email: "priya@aurorarobotics.example" },
      update: {},
      create: {
        companyId: company.id,
        name: "Priya Nair",
        email: "priya@aurorarobotics.example",
        passwordHash,
        role: "ADMIN",
      },
    }),
    prisma.user.upsert({
      where: { email: "marcus@aurorarobotics.example" },
      update: {},
      create: {
        companyId: company.id,
        name: "Marcus Webb",
        email: "marcus@aurorarobotics.example",
        passwordHash,
        role: "MEMBER",
      },
    }),
    prisma.user.upsert({
      where: { email: "dana@aurorarobotics.example" },
      update: {},
      create: {
        companyId: company.id,
        name: "Dana Okafor",
        email: "dana@aurorarobotics.example",
        passwordHash,
        role: "MEMBER",
      },
    }),
  ]);

  const controlsByCode: Record<string, { id: string }> = {};
  for (const c of CONTROLS) {
    const control = await prisma.control.upsert({
      where: { code: c.code },
      update: { title: c.title, description: c.description, category: c.category },
      create: c,
    });
    controlsByCode[c.code] = control;
  }

  type Plan = {
    status: ControlStatusValue;
    ownerId: string | null;
    evidence?: {
      type: EvidenceType;
      content: string;
      fileName?: string;
      mimeType?: string;
      uploadedById: string;
    };
  };

  const plans: Record<string, Plan> = {
    "PPL-01": {
      status: "EVIDENCE_ATTACHED",
      ownerId: priya.id,
      evidence: {
        type: "NOTE",
        content:
          "Checkr background check reports on file for all 5 current employees. Last verified 2026-08-01, filed in the People Ops shared drive.",
        uploadedById: priya.id,
      },
    },
    "PPL-02": {
      status: "EVIDENCE_ATTACHED",
      ownerId: priya.id,
      evidence: {
        type: "LINK",
        content: "https://drive.example.com/aurora-robotics/nda-agreements",
        uploadedById: priya.id,
      },
    },
    "PPL-03": { status: "IN_PROGRESS", ownerId: dana.id },
    "PPL-04": { status: "IN_PROGRESS", ownerId: marcus.id },
    "PPL-05": { status: "MISSING", ownerId: marcus.id },
    "PPL-06": { status: "MISSING", ownerId: null },
    "PPL-07": {
      status: "EVIDENCE_ATTACHED",
      ownerId: dana.id,
      evidence: {
        type: "FILE",
        content: "seed/training-log-2026.csv",
        fileName: "training-log-2026.csv",
        mimeType: "text/csv",
        uploadedById: dana.id,
      },
    },
    "PPL-08": { status: "MISSING", ownerId: priya.id },
    "PPL-09": { status: "IN_PROGRESS", ownerId: marcus.id },
    "PPL-10": { status: "MISSING", ownerId: null },
  };

  for (const [code, plan] of Object.entries(plans)) {
    const control = controlsByCode[code];
    await prisma.controlStatus.upsert({
      where: { controlId_companyId: { controlId: control.id, companyId: company.id } },
      update: { status: plan.status, ownerId: plan.ownerId },
      create: {
        controlId: control.id,
        companyId: company.id,
        status: plan.status,
        ownerId: plan.ownerId,
      },
    });

    if (plan.evidence) {
      const existing = await prisma.evidence.findFirst({
        where: { controlId: control.id, companyId: company.id },
      });
      if (!existing) {
        await prisma.evidence.create({
          data: {
            controlId: control.id,
            companyId: company.id,
            type: plan.evidence.type,
            content: plan.evidence.content,
            fileName: plan.evidence.fileName,
            mimeType: plan.evidence.mimeType,
            uploadedById: plan.evidence.uploadedById,
          },
        });
      }
    }
  }

  // One pre-drafted policy for a gap control, so the drafting feature has an example.
  await prisma.policyDraft.upsert({
    where: {
      controlId_companyId: {
        controlId: controlsByCode["PPL-06"].id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      controlId: controlsByCode["PPL-06"].id,
      companyId: company.id,
      questionnaireAnswers: JSON.stringify({
        offboardingTrigger: "HR notifies IT and the employee's manager on the last confirmed day.",
        assetsIssued: "Laptop, badge, and a YubiKey for SSO.",
        accountsToDisable: "Google Workspace, GitHub, AWS, Slack, and the VPN.",
        returnWindow: "Assets are expected back within 5 business days, shipped with a prepaid label for remote staff.",
        whoOwnsProcess: "The People Ops lead (currently Priya) owns the checklist; IT executes the account disabling.",
        exceptions: "Contractors under NDA may keep a personal device but must confirm local data deletion in writing.",
      }),
      generatedText:
        "# Offboarding Asset Return & Account Deactivation Policy (Draft)\n\n" +
        "## Purpose\nThis policy defines how Aurora Robotics, Inc. recovers company property and disables " +
        "system access when an employee or contractor's engagement ends.\n\n" +
        "## Scope\nApplies to all employees and contractors with access to company devices, accounts, or data.\n\n" +
        "## Process\n1. HR notifies IT and the departing employee's manager as soon as the separation date is confirmed.\n" +
        "2. IT disables Google Workspace, GitHub, AWS, Slack, and VPN access no later than the employee's last day.\n" +
        "3. The employee returns all issued assets (laptop, badge, YubiKey) within 5 business days of separation; " +
        "remote employees are shipped a prepaid return label.\n" +
        "4. Contractors permitted to retain a personal device must confirm in writing that company data has been deleted from it.\n" +
        "5. The People Ops lead confirms completion of all steps on the offboarding checklist and files it as evidence.\n\n" +
        "*This is an AI-generated first draft based on your questionnaire answers. Review and edit before treating it as company policy.*",
      status: "DRAFT",
    },
  });

  console.log("Seed complete.");
  console.log("Login with any of:");
  console.log("  priya@aurorarobotics.example / ComplyTrail123! (ADMIN)");
  console.log("  marcus@aurorarobotics.example / ComplyTrail123! (MEMBER)");
  console.log("  dana@aurorarobotics.example / ComplyTrail123! (MEMBER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
