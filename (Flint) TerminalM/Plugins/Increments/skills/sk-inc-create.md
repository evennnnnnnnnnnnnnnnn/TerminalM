# Skill: Create Stream

Create a new work stream for the current checkpoint.

# Actions

1. Find current checkpoint (highest X.0.0)
2. Find next stream number (highest N + 1)
3. Get from user:
   - Stream name
   - Context
4. Create stream document using @tmp-inc-stream, do mo
5. Run @sk-inc-sync
