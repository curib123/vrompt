import { RoutePlaceholder } from '@/components/route-placeholder';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldGroup, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export default function RegisterPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <RoutePlaceholder
        description="The registration route shell is in place with responsive form structure and empty-state messaging."
        eyebrow="Auth"
        title="Create a Vrompt account"
      />
      <Card>
        <FieldGroup>
          <FormField label="Username">
            <Input placeholder="prompt-maker" />
          </FormField>
          <FormField label="Email">
            <Input placeholder="name@example.com" type="email" />
          </FormField>
          <FormField label="Password">
            <Input placeholder="Create a strong password" type="password" />
          </FormField>
          <Button type="submit">Reserve your handle</Button>
        </FieldGroup>
      </Card>
    </div>
  );
}
