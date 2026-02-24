/**
 * DevelopmentalChat — Streaming AI assistant for developmental Q&A.
 * Provides real-time guidance for CHWs and parents using PediScreen AI.
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, MessageCircle, Loader2, Trash2, Stethoscope, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDevelopmentalChat, type ChatRole } from "@/hooks/useDevelopmentalChat";

interface DevelopmentalChatProps {
  childAgeMonths?: number;
  defaultRole?: ChatRole;
  className?: string;
}

export default function DevelopmentalChat({
  childAgeMonths,
  defaultRole = "parent",
  className = "",
}: DevelopmentalChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [role, setRole] = useState<ChatRole>(defaultRole);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, isStreaming, error, sendMessage, cancelStream, clearChat } =
    useDevelopmentalChat({ childAgeMonths, role });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => {
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 200);
              }}
              size="lg"
              className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden ${className}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">PediScreen AI</h3>
                  <p className="text-[10px] text-muted-foreground">Developmental Guidance</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Role toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setRole(role === "parent" ? "chw" : "parent")}
                >
                  {role === "parent" ? (
                    <><Heart className="h-3 w-3 mr-1" /> Parent</>
                  ) : (
                    <><Stethoscope className="h-3 w-3 mr-1" /> CHW</>
                  )}
                </Button>
                {messages.length > 0 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearChat}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {role === "parent"
                      ? "Ask me anything about your child's development!"
                      : "Get clinical guidance on developmental screening."}
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {(role === "parent"
                      ? [
                          "My 18-month-old isn't walking yet",
                          "When should my child start talking?",
                          "Activities for 12-month-old",
                        ]
                      : [
                          "ASQ-3 scoring guidance for 24mo",
                          "Red flags for autism at 18 months",
                          "When to refer for early intervention",
                        ]
                    ).map((q) => (
                      <Badge
                        key={q}
                        variant="outline"
                        className="cursor-pointer text-[10px] hover:bg-primary/10 transition-colors"
                        onClick={() => {
                          setInput(q);
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                      >
                        {q}
                      </Badge>
                    ))}
                  </div>
                  {childAgeMonths && (
                    <p className="text-xs text-muted-foreground">
                      Context: {childAgeMonths}-month-old child
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                      {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                        <span className="inline-block w-1.5 h-4 bg-current opacity-60 animate-pulse ml-0.5 align-text-bottom" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Thinking…</span>
                </motion.div>
              )}
            </ScrollArea>

            {/* Error */}
            {error && (
              <div className="px-4 py-2 text-xs text-destructive bg-destructive/10 border-t border-destructive/20">
                {error}
              </div>
            )}

            {/* Input */}
            <div className="px-3 py-3 border-t border-border bg-muted/20">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={role === "parent" ? "Ask about your child's development…" : "Ask a clinical question…"}
                  disabled={isStreaming}
                  className="text-sm h-9"
                />
                {isStreaming ? (
                  <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={cancelStream}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={!input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-[9px] text-muted-foreground mt-1.5 text-center">
                AI guidance only • Always consult your pediatrician
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
