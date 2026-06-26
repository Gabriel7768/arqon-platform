import type { Concept } from "../types/index.js";

/** Human-readable display label for each concept. */
export const CONCEPT_LABELS: Record<Concept, string> = {
  customer: "Customer",
  amount: "Amount",
  invoiceAmount: "Invoice Amount",
  contractValue: "Contract Value",
  mrr: "MRR",
  arr: "ARR",
  dueDate: "Due Date",
  invoiceDate: "Invoice Date",
  contractStart: "Contract Start",
  contractEnd: "Contract End",
  renewalDate: "Renewal Date",
  lastActivity: "Last Activity",
  lastContact: "Last Contact",
  createdAt: "Created At",
  updatedAt: "Updated At",
  status: "Status",
  invoiceStatus: "Invoice Status",
  paymentStatus: "Payment Status",
  pipelineStage: "Pipeline Stage",
  owner: "Owner",
  company: "Company",
  email: "Email",
  opportunity: "Opportunity",
  deal: "Deal",
  probability: "Probability",
  currency: "Currency",
  region: "Region",
  country: "Country",
  salesRep: "Sales Rep",
  product: "Product",
  sku: "SKU",
  subscription: "Subscription",
  plan: "Plan",
  invoiceNumber: "Invoice Number",
  contractId: "Contract ID",
  opportunityId: "Opportunity ID",
  customerId: "Customer ID",
};

/**
 * All concepts in the canonical order. More-specific concepts appear before
 * their parent concepts so the conflict resolver can prefer specificity
 * when confidence scores are equal.
 *
 * To add a concept: add to the `Concept` union in types/, add a label here,
 * add a dictionary entry, and optionally extend `ALL_CONCEPTS` order.
 */
export const ALL_CONCEPTS: readonly Concept[] = [
  // IDs (most specific — appear before their parent concepts)
  "customerId",
  "opportunityId",
  "contractId",
  "invoiceNumber",
  // Amounts (specific → general)
  "invoiceAmount",
  "contractValue",
  "mrr",
  "arr",
  "amount",
  // Dates (specific → general)
  "dueDate",
  "invoiceDate",
  "contractStart",
  "contractEnd",
  "renewalDate",
  "lastActivity",
  "lastContact",
  "createdAt",
  "updatedAt",
  // Status (specific → general)
  "invoiceStatus",
  "paymentStatus",
  "pipelineStage",
  "status",
  // Entities
  "customer",
  "company",
  "email",
  "owner",
  "salesRep",
  // Deals
  "opportunity",
  "deal",
  "probability",
  // Products
  "product",
  "sku",
  "subscription",
  "plan",
  // Geography
  "region",
  "country",
  "currency",
] as const;
