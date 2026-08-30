import { RoutePlaceholder } from '@/components/route-placeholder';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldGroup, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <RoutePlaceholder
        description="Authentication flows are intentionally not implemented yet, but the route, layout, and form primitives are ready for Phase 6."
        eyebrow="Auth"
        title="Log in to Vrompt"
      />
      <Card>
        <FieldGroup>
          <FormField label="Email">
            <Input placeholder="name@example.com" type="email" />
          </FormField>
          <FormField label="Password">
            <Input placeholder="Enter your password" type="password" />
          </FormField>
          <Button type="submit">Continue</Button>
        </FieldGroup>
      </Card>
    </div>
  );
}
