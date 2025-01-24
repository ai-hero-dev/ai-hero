Extracting structured data out of unstructured data is one of the most powerful use cases for LLM's.

In this example, we're going to be passing an arbitrary file to an LLM and getting it to analyze it for us.

In this case, a PDF of an invoice. We're going to pass it the PDF, and it's going to extract some structured data for us.

It means you can turn all the documents that you might have on your system into something that you can store in a database, query, and search.

### Creating the Schema

Since we're using structured data, let's create a `Zod` schema to handle this.

```ts
import { z } from "zod";

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
```

It's a pretty big one. We've got the total amount of the invoice, the currency, the invoice number, the address, the company name, and the invoicee address.

We've seen this before, but note how I'm providing descriptions to every single property I can. I want to give the LLM the best chance of success.

### Extracting Data from the Invoice

<Scrollycoding>

# !!steps

Let's create an `extractDataFromInvoice` function. Inside, we'll pass the schema to `generateObject`, with a little system prompt.

We're expecting an `invoicePath`, which is a path to a PDF on our file system.

```ts ! example.ts
import { generateObject } from "ai";

export const extractDataFromInvoice = async (
  invoicePath: string,
) => {
  await generateObject({
    model,
    system: promptTemplate`
      You will receive an invoice.
      Please extract the data from the invoice.
    `,
    schema,
  });
};
```

# !!steps

The image example that we saw before used the `messages` array. We can do the same thing with the PDF, but this time we're going to use a content type of `file` instead of `image`.

We're using `readFileSync` here to grab the raw binary data from the file on the file system, and pass that directly to the AI SDK.

```ts ! example.ts
import { readFileSync } from "fs";
import { generateObject } from "ai";

export const extractDataFromInvoice = async (
  invoicePath: string,
) => {
  await generateObject({
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
          },
        ],
      },
    ],
  });
};
```

# !!steps

We also need to pass it a MIME type to tell the LLM what sort of file it's receiving. It could probably work this out on its own by checking the magic numbers of the file, but it's just polite, isn't it?

```ts ! example.ts
import { readFileSync } from "fs";
import { generateObject } from "ai";

export const extractDataFromInvoice = async (
  invoicePath: string,
) => {
  await generateObject({
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
};
```

# !!steps

Finally, we return the object so we should get the object back that we're expecting.

```ts ! example.ts
import { readFileSync } from "fs";
import { generateObject } from "ai";

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
```

</Scrollycoding>

### Running the Example

Let's give it a go. I've got a PDF of a fake invoice here. Let's pass it in and see how it does.

```ts
const result = await extractDataFromInvoice(
  "./invoice.pdf",
);

console.dir(result, { depth: null });
```

As we can see, we get back the data we were looking for from this invoice.

So this combines two things which we've learned about already: passing arbitrary files to the Vercel AI SDK and using structured data. Very, very cool.
