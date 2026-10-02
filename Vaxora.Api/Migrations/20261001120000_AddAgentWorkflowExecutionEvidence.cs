using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vaxora.Api.Migrations;

[Migration("20261001120000_AddAgentWorkflowExecutionEvidence")]
public partial class AddAgentWorkflowExecutionEvidence : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "PlanJson",
            table: "AgentWorkflows",
            type: "text",
            nullable: false,
            defaultValue: "{}");

        migrationBuilder.AddColumn<string>(
            name: "CompletedStepsJson",
            table: "AgentWorkflows",
            type: "text",
            nullable: false,
            defaultValue: "[]");

        migrationBuilder.AddColumn<string>(
            name: "ToolResultsJson",
            table: "AgentWorkflows",
            type: "text",
            nullable: false,
            defaultValue: "[]");

        migrationBuilder.AddColumn<string>(
            name: "ValidationResultsJson",
            table: "AgentWorkflows",
            type: "text",
            nullable: false,
            defaultValue: "{}");

        migrationBuilder.AddColumn<string>(
            name: "ErrorDetails",
            table: "AgentWorkflows",
            type: "character varying(4000)",
            maxLength: 4000,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "FinalOutcome",
            table: "AgentWorkflows",
            type: "character varying(4000)",
            maxLength: 4000,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "PlanJson", table: "AgentWorkflows");
        migrationBuilder.DropColumn(name: "CompletedStepsJson", table: "AgentWorkflows");
        migrationBuilder.DropColumn(name: "ToolResultsJson", table: "AgentWorkflows");
        migrationBuilder.DropColumn(name: "ValidationResultsJson", table: "AgentWorkflows");
        migrationBuilder.DropColumn(name: "ErrorDetails", table: "AgentWorkflows");
        migrationBuilder.DropColumn(name: "FinalOutcome", table: "AgentWorkflows");
    }
}
