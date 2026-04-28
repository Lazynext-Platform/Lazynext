import { redirect } from 'next/navigation'

// /onboarding has no UI of its own — it's a parent segment for
// create-workspace and first-workflow. Send anyone who lands here
// (typed URL, old bookmark, email link) to the canonical first step.
export default function OnboardingIndexPage(): never {
  redirect('/onboarding/create-workspace')
}
