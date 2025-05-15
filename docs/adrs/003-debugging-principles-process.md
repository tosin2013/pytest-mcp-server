# Title: Structured Debugging Process Using 9 Principles

## Status: Accepted

## Context
Debugging test failures in pytest can be complex and unstructured, often leading to inefficient and ineffective debugging processes. There is a need for a systematic approach to debugging that follows proven methodologies to quickly identify and resolve issues.

The system needs to implement a workflow that guides users through a defined series of debugging steps, capturing insights at each stage and progressing toward resolution in a methodical way.

The primary Bounded Context affected is the Debugging Process context, which is responsible for guiding users (and LLMs) through the structured debugging workflow.

## Decision
The architecture implements a structured debugging process based on David Agans' 9 Rules of Debugging:

1. **Understand the System** - Gain high-level awareness of the code and test behavior
2. **Make It Fail** - Reproduce the failure consistently, eliminate flakiness
3. **Quit Thinking and Look** - Examine actual runtime values and unexpected behavior
4. **Divide and Conquer** - Narrow down where in the code the issue is occurring
5. **Change One Thing at a Time** - Test isolated changes to validate hypotheses
6. **Keep an Audit Trail** - Track changes and their effects during debugging
7. **Check the Plug** - Verify basic configuration and environment issues
8. **Get a Fresh View** - Approach the problem from a different perspective
9. **If You Didn't Fix It, It Ain't Fixed** - Verify your solution works and addresses root causes

Each principle corresponds to a step in the debugging process. For each test failure, a debug session is created with these nine steps, and users (or LLMs) work through them sequentially, recording their analysis and findings at each step.

The `DebugWithPrincipleTool` is the primary service that implements this workflow, allowing users to apply each principle to a failure and record the corresponding analysis.

## Identified DDD Elements

### Aggregates
1. **Debug Session Aggregate** - Root entity is the `DebugSession` which contains a sequence of `DebugStep` entities representing the application of each debugging principle.

### Entities
1. **DebugSession** - Represents a debugging session for a specific failure.
2. **DebugStep** - Represents the application of a specific debugging principle within a session.
   
### Value Objects
1. **DebugPrincipleAnalysis** - Contains the analysis data for a specific debugging principle.

### Domain Services
1. **DebugWithPrincipleTool** - Service for applying debugging principles to failures and recording the analysis.
2. **PytestDocsGuideTool** - Service providing documentation and guidance on the debugging principles.

## Dependencies/Interactions
- **PytestFailureTool** - Creates the initial debug session when a failure is registered.
- **FileStorage** - Stores the debug sessions and their progress.
- **GetFailureInfoTool** - Retrieves information about the debug progress.
- **Web UI Components** - Visualize the debug progress and allow users to interact with the debugging process.

## Technology/Patterns
1. **State Machine Pattern** - The debugging process follows a defined sequence of states (principles).
2. **Command Pattern** - Each application of a principle is encapsulated as a command.
3. **Repository Pattern** - Implicitly used to store and retrieve debug sessions.

## Consequences

### Positive
1. **Structured Approach** - Provides a clear, methodical approach to debugging.
2. **Consistency** - All debugging follows the same process, making it easier to collaborate.
3. **Progress Tracking** - Clear visibility into the debugging progress for each failure.
4. **LLM Integration** - The structured approach is well-suited for LLM-assisted debugging.
5. **Knowledge Capture** - Analysis from each step is preserved for future reference.

### Negative
1. **Potential Rigidity** - The fixed sequence of principles may not be optimal for all types of failures.
2. **Overhead** - Requires users to follow and document each step, potentially slowing down simple debugging tasks.
3. **Learning Curve** - Users need to understand the 9 principles and how to apply them effectively.

## Diagrams

### Component Diagram

```mermaid
graph TD
    subgraph "Debugging Process BC"
        DebugWithPrincipleTool[DebugWithPrincipleTool]
        PytestDocsGuideTool[PytestDocsGuideTool]
        DebugSessionRepo[Debug Session Repository]
    end
    
    subgraph "Test Failure Management BC"
        PytestFailureTool[PytestFailureTool]
        GetFailureInfoTool[GetFailureInfoTool]
    end

    subgraph "Presentation Layer"
        DebugSessionComponent[Debug Session Component]
    end

    DebugWithPrincipleTool -->|uses| DebugSessionRepo
    PytestDocsGuideTool -->|provides guidance for| DebugWithPrincipleTool
    
    PytestFailureTool -->|creates| DebugSessionRepo
    GetFailureInfoTool -->|reads| DebugSessionRepo
    
    DebugSessionComponent -->|displays| DebugSessionRepo
    DebugSessionComponent -->|invokes| DebugWithPrincipleTool
```

### Class Diagram for Debug Session Aggregate

```mermaid
classDiagram
    class DebugSession {
        +id: string
        +failure_id: string
        +created_at: string
        +debug_steps: DebugStep[]
        +getCurrentStep() DebugStep
        +completeCurrentStep(analysis) void
        +moveToNextStep() DebugStep
    }
    
    class DebugStep {
        +step: number
        +name: string
        +status: string
        +started_at: string
        +completed_at: string
        +llm_analysis: DebugPrincipleAnalysis
        +isComplete() boolean
        +complete(analysis) void
    }
    
    class DebugPrincipleAnalysis {
        +principle: string
        +findings: string
        +recommendations: string
        +next_steps: string
    }
    
    DebugSession "1" *-- "9" DebugStep : contains
    DebugStep "1" *-- "0..1" DebugPrincipleAnalysis : has
```

### Sequence Diagram for Debugging Process

```mermaid
sequenceDiagram
    participant Client
    participant DebugWithPrincipleTool
    participant DebugSessionRepo
    
    Client->>DebugWithPrincipleTool: Apply Principle 1 (with analysis)
    DebugWithPrincipleTool->>DebugSessionRepo: Get debug session
    DebugSessionRepo-->>DebugWithPrincipleTool: Return session
    
    DebugWithPrincipleTool->>DebugWithPrincipleTool: Complete current step
    DebugWithPrincipleTool->>DebugWithPrincipleTool: Move to next step
    
    DebugWithPrincipleTool->>DebugSessionRepo: Update debug session
    DebugSessionRepo-->>DebugWithPrincipleTool: Confirm update
    
    DebugWithPrincipleTool-->>Client: Return updated session info
    
    Note over Client,DebugSessionRepo: Process repeats for each principle
    
    Client->>DebugWithPrincipleTool: Apply Principle 9 (with analysis)
    DebugWithPrincipleTool->>DebugSessionRepo: Get debug session
    DebugSessionRepo-->>DebugWithPrincipleTool: Return session
    
    DebugWithPrincipleTool->>DebugWithPrincipleTool: Complete final step
    DebugWithPrincipleTool->>DebugWithPrincipleTool: Mark debugging complete
    
    DebugWithPrincipleTool->>DebugSessionRepo: Update debug session
    DebugSessionRepo-->>DebugWithPrincipleTool: Confirm update
    
    DebugWithPrincipleTool-->>Client: Return completed session info
``` 