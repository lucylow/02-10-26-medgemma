import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const screeningSchema = z.object({
  childAge: z
    .string()
    .min(1, "Child age is required")
    .regex(/^\d+$/, "Use age in months (numbers only)"),
  domain: z.string().min(1, "Domain is required"),
  observations: z.string().min(10, "Please provide a short description of your observations."),
});

export type ScreeningFormValues = z.infer<typeof screeningSchema>;

interface ScreeningFormProps {
  defaultValues?: Partial<ScreeningFormValues>;
  onSubmit: (values: ScreeningFormValues) => Promise<void> | void;
  submitting?: boolean;
}

export function ScreeningForm({ defaultValues, onSubmit, submitting }: ScreeningFormProps) {
  const form = useForm<ScreeningFormValues>({
    resolver: zodResolver(screeningSchema),
    defaultValues: {
      childAge: "",
      domain: "communication",
      observations: "",
      ...defaultValues,
    },
  });

  const handleSubmit = (values: ScreeningFormValues) => {
    return onSubmit(values);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
        aria-label="PediScreen AI screening form"
      >
        <FormField
          control={form.control}
          name="childAge"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Child age (months)</FormLabel>
              <FormControl>
                <Input {...field} inputMode="numeric" placeholder="e.g. 24" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domain</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. communication, motor, social" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observations</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={5}
                  placeholder="Describe what you or the caregiver have noticed about the child's development."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Run screening"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default ScreeningForm;

