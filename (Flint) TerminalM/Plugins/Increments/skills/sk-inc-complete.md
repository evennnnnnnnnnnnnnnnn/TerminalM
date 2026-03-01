# Skill: Complete Stream

Mark a stream as complete and ready for consolidation.

# Actions

1. Identify stream (ask user or use active one)
2. Check all tasks are done
   - If incomplete: complete now, move to future stream, or remove?
3. Update tags: `#inc/active` → `#inc/complete`, `#ld/living` → `#ld/dead`
4. Add final log entry
5. Run @sk-inc-sync
6. If all streams complete, suggest @sk-inc-consolidate
