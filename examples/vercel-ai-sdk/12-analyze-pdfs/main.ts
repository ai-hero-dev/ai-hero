import { z } from "zod";
import { generateObject } from "ai";
import { pdfModel as model } from "../../_shared/models.ts";
import { readFileSync } from "fs";
import path from "path";
import { promptTemplate } from "@promptbook/utils";

const schema = z
  .object({
    total: z
      .number()
      .describe("The total amount of the invoice."),
    currency: z
      .string()
      .describe("The currency of the total amount."),
    invoiceNumber: z
      .string()
      .describe("The invoice number."),
    companyAddress: z
      .string()
      .describe(
        "The address of the company or person issuing the invoice.",
      ),
    companyName: z
      .string()
      .describe(
        "The name of the company issuing the invoice.",
      ),
    invoiceeAddress: z
      .string()
      .describe(
        "The address of the company or person receiving the invoice.",
      ),
  })
  .describe("The extracted data from the invoice.");

export const extractDataFromInvoice = async (
  invoicePath: string,
) => {
  const { object } = await generateObject({
    model,
    system: promptTemplate`
      You will receive an invoice.
      Please extract the data from the invoice.
    `,
    schema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: readFileSync(invoicePath),
            mimeType: "application/pdf",
          },
        ],
      },
    ],
  });

  return object;
};

const result = await extractDataFromInvoice(
  path.join(import.meta.dirname, "./invoice-1.pdf"),
);

console.dir(result, { depth: null });
