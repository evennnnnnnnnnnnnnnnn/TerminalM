This workflow belongs to the Projects plugin. Ensure you have the @init-proj.md in context before continuing.

# Workflow: Create Task

Create a task specification. 

# Input

- Context of a task

# Actions

## Stage 1: Task Creation

- Create the task using the @tmp-proj-task template. Make sure to find the correct latest task number so the new task is numbered correctly. 
- If we are working in the context of an increment, attach the task to the increment
- The task status should be marked as draft
- Other information like priority and due date is left blank unless specified
- Once you have completed the above, progress to the next stage. 

## Stage 2: Task Review

- Converse with the user to refine the task specifications. At this point the user might use other plugins to help with communication. 
- Once you receive confirmation from the user, progress to the next stage. 

## Stage 3: Update Project

- Update the task to the relevant priority in the yaml
- Use @sk-ld-sync across everything
- Update export and state if needed

# Output

- New task specification
- New task state propagated across Flint 