

# Plan: Graphic Briefs Date Display + Assignment Multi-Submit Fix

## Update 1: Graphic Briefs Queue - Add Date Display

**Current state:** Active queue cards show `[Requester] -> [Designer] . [Time]`
**Target:** Show `[Date] [Time] | [Type] | [Requester] -> [Designer]`

### Changes in `src/pages/GraphicBriefs.tsx`:
- Update the active brief card layout (lines 248-266) to display `request_date` formatted as DD-MM-YYYY alongside the time
- Update the done brief card layout (lines 275-289) similarly
- New format: `DD-MM-YYYY HH:mm | BriefType | SalesName -> DesignerName`

---

## Update 2: Assignment Submissions - Multi-Submit Fix

**Current state:** The `assignment_submissions` table has `UNIQUE (assignment_id, user_id)`, which blocks a Manager from submitting on behalf of multiple sales people. The `notes` field is being repurposed to store the `submitById` (sales member ID).

### Database Migration:
1. Add a new `submitted_by_member_id` column (UUID, nullable, references `team_members`)
2. Drop the existing unique constraint on `(assignment_id, user_id)`
3. Add a new unique constraint on `(assignment_id, submitted_by_member_id)`

```sql
-- Add submitted_by_member_id column
ALTER TABLE public.assignment_submissions
ADD COLUMN submitted_by_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL;

-- Drop old unique constraint
ALTER TABLE public.assignment_submissions
DROP CONSTRAINT IF EXISTS assignment_submissions_assignment_id_user_id_key;

-- Add new unique constraint
ALTER TABLE public.assignment_submissions
ADD CONSTRAINT assignment_submissions_assignment_id_submitted_by_key
UNIQUE (assignment_id, submitted_by_member_id);
```

### Code Changes in `src/pages/Assignments.tsx`:
1. **Save to proper column:** Update `handleSubmitProof` to write `submitById` into the new `submitted_by_member_id` column instead of `notes`
2. **Duplicate warning:** After selecting a sales member in the Submit Proof modal, check if `submissions` already contains a record with matching `assignment_id` and `submitted_by_member_id`. If yes, show a red warning: "คนนี้ส่งงานแล้ว"
3. **Disable submit button** when duplicate is detected
4. **Update Submission interface** to include the new `submitted_by_member_id` field
5. **Update submitter display** to show the sales member name instead of auth user name

### Technical Details

**Files modified:**
- `src/pages/GraphicBriefs.tsx` - Queue card layout update
- `src/pages/Assignments.tsx` - Submission logic + duplicate warning UI
- New migration SQL for schema change

**Submission duplicate check logic:**
```tsx
const isDuplicate = selectedAssignment && submitById
  ? submissions.some(s => s.assignment_id === selectedAssignment.id && s.submitted_by_member_id === submitById)
  : false;
```

**Warning UI in submit modal:**
```tsx
{isDuplicate && (
  <p className="text-sm text-destructive font-medium">คนนี้ส่งงานแล้ว</p>
)}
```

