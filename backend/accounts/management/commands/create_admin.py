from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Create (or promote) a platform admin. The same account can sign in to the storefront "
        "and to the admin panel at /admin."
    )

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--email", default="")
        parser.add_argument("--password", required=True)
        parser.add_argument("--superuser", action="store_true", help="Also grant Django-admin superuser rights.")

    def handle(self, *args, **opts):
        username = opts["username"]
        user, created = User.objects.get_or_create(username=username, defaults={"email": opts["email"]})
        if len(opts["password"]) < 8:
            raise CommandError("Password must be at least 8 characters.")
        user.role = User.Role.ADMIN
        user.is_staff = True
        user.is_active = True
        if opts["superuser"]:
            user.is_superuser = True
        if opts["email"]:
            user.email = opts["email"]
        user.set_password(opts["password"])
        user.save()
        self.stdout.write(self.style.SUCCESS(f"{'Created' if created else 'Updated'} admin '{username}'."))
