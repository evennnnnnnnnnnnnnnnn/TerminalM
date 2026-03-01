# Skill: Consolidate

Create a checkpoint from completed streams.

# Actions

1. Find completed streams (`#inc/complete` + `#ld/dead`)
2. If active streams exist, warn and ask how to proceed
3. Determine new checkpoint (current X + 1)
4. Create checkpoint using @tmp-inc-checkpoint
   - Summarize each consolidated stream
   - Document current system state
5. Create adhoc stream using @tmp-inc-adhoc
6. Mark previous checkpoint `#ld/dead`
7. Run @sk-inc-sync
