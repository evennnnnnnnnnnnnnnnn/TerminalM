This workflow belongs to the Projects plugin. Ensure you have the @init-proj.md in context before continuing.

# Workflow: Do Task

Execute a task.

# Input

- Task specification (Task)
- Context around the task
- (Optional) aiding prompts and instructions on how to complete the task

# Actions

## Stage 1: Task Work

- Set the task status to in-progress
- Read the task and implement the task until it is finished or until you have done everything you can without human input (what is left is human blocking todos)
- Continue this look until you think you have finished the task, at which point move to the next stage
- Whenever you complete any meaningful amount of work, make sure to record it in the task log

## Stage 2: Task Review

- Mark the task status to `review`
- Update the task file with progress
- Provide an update to the user based on your completion
- The user will converse with you to refine. If the user makes a new request or refinement, make sure to capture it in the task
- Once you receive confirmation from the user, progress to the next stage. 

## Stage 3: Update Project

- Update the task to done in the yaml
- Set the completed date (ISO 8601)
- Update the tag #ld/living -> #ld/dead
- Use @sk-ld-sync across everything
- Update export and state if needed

# Output

- Completed task