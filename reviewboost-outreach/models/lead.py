from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Lead:
    name: str
    address: str
    city: str
    rating: float
    review_count: int
    phone: str
    website: str
    place_id: str
    scraped_at: str
    email: str = ""
    email_status: str = "pending"       # pending | found | not_found | no_website
    email_subject: str = ""
    email_body: str = ""
    email_ready: str = ""               # yes | failed | ""
    sent_at: str = ""
    followup1_due: str = ""
    followup1_sent: str = ""
    followup2_due: str = ""
    followup2_sent: str = ""
    outreach_status: str = "not_contacted"  # not_contacted | contacted | replied | converted | unsubscribed
    notes: str = ""

    # ------------------------------------------------------------------ #
    # Convenience helpers                                                  #
    # ------------------------------------------------------------------ #

    def is_emailable(self) -> bool:
        return bool(self.email) and self.email_ready == "yes"

    def can_receive_outreach(self) -> bool:
        return self.outreach_status not in {"replied", "converted", "unsubscribed"}

    def to_dict(self) -> dict[str, str | float | int]:
        return {
            "name": self.name,
            "address": self.address,
            "city": self.city,
            "rating": self.rating,
            "review_count": self.review_count,
            "phone": self.phone,
            "website": self.website,
            "place_id": self.place_id,
            "scraped_at": self.scraped_at,
            "email": self.email,
            "email_status": self.email_status,
            "email_subject": self.email_subject,
            "email_body": self.email_body,
            "email_ready": self.email_ready,
            "sent_at": self.sent_at,
            "followup1_due": self.followup1_due,
            "followup1_sent": self.followup1_sent,
            "followup2_due": self.followup2_due,
            "followup2_sent": self.followup2_sent,
            "outreach_status": self.outreach_status,
            "notes": self.notes,
        }

    @classmethod
    def from_dict(cls, data: dict[str, str]) -> "Lead":
        return cls(
            name=data.get("name", ""),
            address=data.get("address", ""),
            city=data.get("city", ""),
            rating=float(data.get("rating", 0.0)),
            review_count=int(data.get("review_count", 0)),
            phone=data.get("phone", ""),
            website=data.get("website", ""),
            place_id=data.get("place_id", ""),
            scraped_at=data.get("scraped_at", ""),
            email=data.get("email", ""),
            email_status=data.get("email_status", "pending"),
            email_subject=data.get("email_subject", ""),
            email_body=data.get("email_body", ""),
            email_ready=data.get("email_ready", ""),
            sent_at=data.get("sent_at", ""),
            followup1_due=data.get("followup1_due", ""),
            followup1_sent=data.get("followup1_sent", ""),
            followup2_due=data.get("followup2_due", ""),
            followup2_sent=data.get("followup2_sent", ""),
            outreach_status=data.get("outreach_status", "not_contacted"),
            notes=data.get("notes", ""),
        )
