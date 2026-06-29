from __future__ import annotations

import sys
from pathlib import Path

from dotenv import load_dotenv
from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Confirm, Prompt
from rich.table import Table
from rich.text import Text

load_dotenv()

console = Console()

_BANNER = r"""
 ____            _               ____                       _
|  _ \ _____   _(_) _____      _| __ )  ___   ___  ___| |_
| |_) / _ \ \ / / |/ _ \ \ /\ / /  _ \ / _ \ / _ \/ __| __|
|  _ <  __/\ V /| |  __/\ V  V /| |_) | (_) | (_) \__ \ |_
|_| \_\___| \_/ |_|\___| \_/\_/ |____/ \___/ \___/|___/\__|
"""


def _show_banner() -> None:
    console.print(Text(_BANNER, style="bold cyan"))
    console.print(
        Panel(
            "[bold green]Restaurant Lead Generation & Outreach Pipeline[/bold green]\n"
            "[dim]Targeting restaurants in Chandigarh & Mohali, India[/dim]",
            border_style="cyan",
            padding=(0, 2),
        )
    )


def _show_menu() -> str:
    console.print("\n[bold yellow]── Main Menu ──[/bold yellow]")
    options: list[tuple[str, str]] = [
        ("1", "Run full pipeline  (scrape → email → AI → send)"),
        ("2", "Scrape leads from Google Places"),
        ("3", "Find emails from websites"),
        ("4", "Generate AI emails with Claude"),
        ("5", "Send outreach emails via Brevo"),
        ("6", "View leads summary"),
        ("7", "Export / show latest CSV path"),
        ("8", "Validate environment variables"),
        ("9", "Exit"),
    ]
    for num, desc in options:
        console.print(f"  [bold cyan]{num}[/bold cyan]  {desc}")
    return Prompt.ask(
        "\n[bold]Choose[/bold]",
        choices=[o[0] for o in options],
        show_choices=False,
    )


def _show_leads_table(leads: list) -> None:
    if not leads:
        console.print("[yellow]No leads to display.[/yellow]")
        return

    table = Table(title=f"Leads ({len(leads)} total)", box=box.ROUNDED, show_lines=True)
    table.add_column("#", style="dim", width=4)
    table.add_column("Name", style="bold", max_width=28)
    table.add_column("City", width=12)
    table.add_column("Rating", justify="right", width=7)
    table.add_column("Reviews", justify="right", width=8)
    table.add_column("Email", max_width=30)
    table.add_column("Status", max_width=18)

    for i, lead in enumerate(leads[:50], 1):
        email_display = lead.email[:28] if lead.email else "[dim]—[/dim]"
        status_style = {
            "not_contacted": "yellow",
            "contacted": "cyan",
            "sequence_complete": "green",
            "converted": "bold green",
            "replied": "blue",
            "unsubscribed": "red",
        }.get(lead.outreach_status, "white")

        table.add_row(
            str(i),
            lead.name[:26],
            lead.city,
            str(lead.rating),
            str(lead.review_count),
            email_display,
            f"[{status_style}]{lead.outreach_status}[/{status_style}]",
        )

    console.print(table)
    if len(leads) > 50:
        console.print(f"[dim]… and {len(leads) - 50} more rows not shown[/dim]")


def _validate_env() -> None:
    from utils.validator import validate_env

    ok, missing = validate_env()
    if ok:
        console.print("[bold green]✓ All required environment variables are set.[/bold green]")
    else:
        console.print(f"[bold red]✗ Missing:[/bold red] {', '.join(missing)}")
        console.print("[dim]Copy .env.example → .env and fill in the values.[/dim]")


def _run_full_pipeline() -> None:
    from pipeline import run_full_pipeline

    city_input = Prompt.ask(
        "City filter",
        choices=["Chandigarh", "Mohali", "both"],
        default="both",
    )
    city_arg = None if city_input == "both" else city_input
    dry_run = Confirm.ask("Dry run? (no real emails sent)", default=False)

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as p:
        task = p.add_task("Running full pipeline…", total=None)
        try:
            leads = run_full_pipeline(city=city_arg, dry_run=dry_run)
            p.update(task, description="[green]Done![/green]")
        except Exception as exc:
            console.print(f"[bold red]Error:[/bold red] {exc}")
            return

    console.print(f"[bold green]✓ Pipeline complete.[/bold green] {len(leads)} leads processed.")
    _show_leads_table(leads)


def _run_scrape() -> None:
    from scripts.scraper import scrape_leads
    from utils.csv_handler import write_leads
    from datetime import datetime, timezone

    city_input = Prompt.ask(
        "City filter",
        choices=["Chandigarh", "Mohali", "both"],
        default="both",
    )
    city_arg = None if city_input == "both" else city_input

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as p:
        task = p.add_task("Scraping Google Places…", total=None)
        try:
            leads = scrape_leads(city=city_arg)
            p.update(task, description="[green]Done![/green]")
        except Exception as exc:
            console.print(f"[bold red]Error:[/bold red] {exc}")
            return

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = f"data/leads_{ts}.csv"
    Path("data").mkdir(exist_ok=True)
    write_leads(leads, path)
    console.print(f"[bold green]✓[/bold green] {len(leads)} leads saved → [cyan]{path}[/cyan]")
    _show_leads_table(leads)


def _run_email_finder() -> None:
    from pipeline import run_email_step

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as p:
        task = p.add_task("Finding emails…", total=None)
        try:
            leads = run_email_step()
            p.update(task, description="[green]Done![/green]")
        except Exception as exc:
            console.print(f"[bold red]Error:[/bold red] {exc}")
            return

    found = sum(1 for ld in leads if ld.email_status == "found")
    console.print(f"[bold green]✓[/bold green] Emails found: {found}/{len(leads)}")


def _run_ai_writer() -> None:
    from pipeline import run_ai_step

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as p:
        task = p.add_task("Generating AI emails…", total=None)
        try:
            leads = run_ai_step()
            p.update(task, description="[green]Done![/green]")
        except Exception as exc:
            console.print(f"[bold red]Error:[/bold red] {exc}")
            return

    ready = sum(1 for ld in leads if ld.email_ready == "yes")
    console.print(f"[bold green]✓[/bold green] {ready} emails ready to send")


def _run_sender() -> None:
    from pipeline import run_send_step

    dry_run = Confirm.ask("Dry run? (no real emails sent)", default=False)

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as p:
        task = p.add_task("Sending outreach…", total=None)
        try:
            leads = run_send_step(dry_run=dry_run)
            p.update(task, description="[green]Done![/green]")
        except Exception as exc:
            console.print(f"[bold red]Error:[/bold red] {exc}")
            return

    sent = sum(1 for ld in leads if ld.outreach_status in ("contacted", "sequence_complete"))
    console.print(f"[bold green]✓[/bold green] Outreach complete — {sent} leads contacted")


def _view_leads() -> None:
    from utils.csv_handler import get_latest_csv, read_leads

    path = get_latest_csv()
    if not path:
        console.print("[yellow]No leads CSV found. Run the scrape step first.[/yellow]")
        return
    console.print(f"[dim]Loading: {path}[/dim]")
    _show_leads_table(read_leads(path))


def _export_leads() -> None:
    from utils.csv_handler import get_latest_csv

    path = get_latest_csv()
    if path:
        console.print(f"[bold green]Latest CSV:[/bold green] [cyan]{path}[/cyan]")
    else:
        console.print("[yellow]No leads CSV found.[/yellow]")


def main() -> None:
    _show_banner()

    _HANDLERS = {
        "1": _run_full_pipeline,
        "2": _run_scrape,
        "3": _run_email_finder,
        "4": _run_ai_writer,
        "5": _run_sender,
        "6": _view_leads,
        "7": _export_leads,
        "8": _validate_env,
    }

    while True:
        choice = _show_menu()
        if choice == "9":
            console.print("\n[bold cyan]Goodbye![/bold cyan]")
            sys.exit(0)
        handler = _HANDLERS.get(choice)
        if handler:
            handler()


if __name__ == "__main__":
    main()
