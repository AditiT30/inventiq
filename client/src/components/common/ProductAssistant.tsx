import { useState } from "react";
import { Bot, MessageCircle, SendHorizontal } from "lucide-react";

import { askProductAssistant, formatCurrency, type ProductAssistantReference } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProductAssistantProps = {
  selectedProductCode?: string;
  variant?: "inline" | "popup";
};

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  products?: ProductAssistantReference[];
};

const suggestedQuestions = [
  "Which product is low in stock?",
  "Summarize the selected product.",
  "Which products are highest value?",
];

function ProductAssistantPanel({
  selectedProductCode,
}: {
  selectedProductCode?: string;
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      role: "assistant",
      content:
        "Ask about stock levels, pricing, product details, or what needs attention. I answer using the live product database.",
    },
  ]);

  const submitQuestion = async (nextQuestion?: string) => {
    const prompt = (nextQuestion ?? question).trim();
    if (!prompt) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessages((current) => [...current, { role: "user", content: prompt }]);
      setQuestion("");

      const response = await askProductAssistant(prompt, selectedProductCode);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.answer,
          products: response.products,
        },
      ]);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Unable to contact the product assistant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="ops-panel  rounded-[32px] p-6">
      <div className=" flex items-start justify-between gap-4">
        <div>
          <div className="ops-kicker">Product assistant</div>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Ask the catalog</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#9aa08d]">
            Grounded answers from the live product database.
          </p>
        </div>
        <div className="flex size-12 items-center justify-center rounded-2xl border border-[#d6ff2e]/18 bg-[#d6ff2e]/10 text-[#effd97]">
          <Bot className="size-5" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {suggestedQuestions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => void submitQuestion(item)}
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#c8ceb4] hover:bg-white/[0.05]"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-[24px] border px-4 py-4 text-sm leading-7 ${
              message.role === "assistant"
                ? "border-white/8 bg-white/[0.03] text-[#e8edd5]"
                : "border-[#d6ff2e]/16 bg-[#d6ff2e]/8 text-[#f3f8df]"
            }`}
          >
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a6ac93]">
              {message.role === "assistant" ? "Assistant" : "You"}
            </div>
            <div>{message.content}</div>
            {message.products?.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {message.products.map((product) => (
                  <div key={product.product_code} className="ops-telemetry rounded-[22px] px-4 py-4">
                    <div className="text-sm font-semibold text-white">{product.name}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#7e8470]">
                      {product.product_code}
                    </div>
                    <div className="mt-3 text-sm text-[#bac0a8]">
                      {product.quantity} units • {formatCurrency(product.price)}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex gap-3">
        <Input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submitQuestion();
            }
          }}
          placeholder="Ask about product availability, price, or stock risk"
          className="h-12 rounded-full border-white/10 bg-white/[0.03] px-5 text-sm text-white placeholder:text-[#666b59]"
        />
        <Button
          type="button"
          onClick={() => void submitQuestion()}
          disabled={loading}
          className="rounded-full bg-[#d6ff2e] px-5 text-sm font-semibold text-[#171711] hover:bg-[#e5ff70]"
        >
          <SendHorizontal className="size-4" />
          {loading ? "Thinking..." : "Ask"}
        </Button>
      </div>
    </section>
  );
}

export default function ProductAssistant({
  selectedProductCode,
  variant = "inline",
}: ProductAssistantProps) {
  const [open, setOpen] = useState(false);

  if (variant === "inline") {
    return <ProductAssistantPanel selectedProductCode={selectedProductCode} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-3 rounded-full  border border-[#d6ff2e] bg-[#0f100c]/85 px-5 py-3 text-sm font-semibold text-[#effd97] shadow-[0_18px_50px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-transform hover:-translate-y-0.5 hover:bg-[#141510]/92"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-[#d6ff2e]/12">
          <MessageCircle className="size-4.5" />
        </span>
        <span className="hidden sm:inline">Ask Inventiq AI</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl rounded-[32px] border border-white/10 bg-black p-0 text-white shadow-[0_30px_100px_rgba(0,0,0,0.42)]">
          <DialogHeader className=" px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">
                  Inventiq AI assistant
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-7 text-[#9ca18e]">
                  Ask product questions grounded in your live inventory database.
                </DialogDescription>
              </div>
              {/*<button*/}
              {/*  type="button"*/}
              {/*  onClick={() => setOpen(false)}*/}
              {/*  className="flex size-10 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-[#b8bea4] hover:bg-white/[0.06] hover:text-white"*/}
              {/*>*/}
              {/*  <X className="size-4" />*/}
              {/*</button>*/}
            </div>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto p-4">
            <ProductAssistantPanel selectedProductCode={selectedProductCode} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
