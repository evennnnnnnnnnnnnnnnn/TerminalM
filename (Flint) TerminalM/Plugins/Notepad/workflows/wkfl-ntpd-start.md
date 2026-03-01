This workflow belongs to the Notepad plugin. Ensure you have @init-ntpd.md in context before continuing.

# Workflow: Start Notepad

Create a new notepad and begin brainstorming.

# Input

- Topic for the notepad
- Initial message/question (optional)

# Actions

## Stage 1: Create Notepad

1. Find the next notepad number by checking existing notepads in `Mesh/Notepads/
2. Create the notepad using @tmp-ntpd-notepad with:
   - Numbered filename: `(Notepad) XXX Topic Name.md`
   - Status: `active`
   - Topic field populated
3. If initial message provided, add it to the notepad

## Stage 2: Gather Context

1. Run multiple parallel subagents to find all the context that is needed for this conversation, both inside teh flint and in any referenced codebases. 

## Stage 3: Begin Conversation

1. Respond to the topic/initial message with a blockquote response
2. Continue responding as the user adds content using @sk-ntpd-respond

# Output

- New notepad in `active` state
- Initial conversation started
