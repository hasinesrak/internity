import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export const INVOICE_STATUSES = ["draft", "open", "paid", "void"] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export interface InvoiceLineItem { description: string; quantity: number; unitAmountMinor: number; amountMinor: number }
export interface InvoiceShape {
  organizationId: Types.ObjectId
  number: string
  status: InvoiceStatus
  amountMinor: number
  currency: string
  dueAt: Date | null
  paidAt: Date | null
  providerInvoiceId: string | null
  hostedInvoiceUrl: string | null
  invoicePdfUrl: string | null
  lineItems: InvoiceLineItem[]
  createdAt: Date
  updatedAt: Date
}

const lineSchema = new Schema<InvoiceLineItem>({
  description: { type: String, required: true }, quantity: { type: Number, required: true, min: 1 },
  unitAmountMinor: { type: Number, required: true, min: 0 }, amountMinor: { type: Number, required: true, min: 0 },
}, { _id: false })
const schema = new Schema<InvoiceShape>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  number: { type: String, required: true, trim: true },
  status: { type: String, enum: INVOICE_STATUSES, default: "draft" },
  amountMinor: { type: Number, required: true, min: 0 }, currency: { type: String, default: "usd", lowercase: true },
  dueAt: { type: Date, default: null }, paidAt: { type: Date, default: null }, providerInvoiceId: { type: String, default: null },
  hostedInvoiceUrl: { type: String, default: null }, invoicePdfUrl: { type: String, default: null },
  lineItems: { type: [lineSchema], default: [] },
}, { timestamps: true })
schema.index({ organizationId: 1, number: 1 }, { unique: true })
schema.index({ organizationId: 1, createdAt: -1 })
schema.index({ providerInvoiceId: 1 }, { unique: true, partialFilterExpression: { providerInvoiceId: { $type: "string" } } })
export type InvoiceDoc = HydratedDocument<InvoiceShape>
export const Invoice = model<InvoiceShape>("Invoice", schema)
