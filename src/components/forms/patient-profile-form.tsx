import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const profileSchema = z.object({
  givenName: z.string().min(1, "First name is required"),
  familyName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  caregiverName: z.string().min(1, "Caregiver name is required"),
});

export type PatientProfileFormValues = z.infer<typeof profileSchema>;

interface PatientProfileFormProps {
  defaultValues?: Partial<PatientProfileFormValues>;
  onSubmit: (values: PatientProfileFormValues) => Promise<void> | void;
  submitting?: boolean;
}

export function PatientProfileForm({ defaultValues, onSubmit, submitting }: PatientProfileFormProps) {
  const form = useForm<PatientProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      givenName: "",
      familyName: "",
      dateOfBirth: "",
      caregiverName: "",
      ...defaultValues,
    },
  });

  const handleSubmit = (values: PatientProfileFormValues) => {
    return onSubmit(values);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
        aria-label="Patient profile form"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="givenName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="given-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="familyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="family-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of birth</FormLabel>
              <FormControl>
                <Input {...field} type="date" autoComplete="bday" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="caregiverName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary caregiver</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="parent" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default PatientProfileForm;

