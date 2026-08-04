from .models import Notification, NotificationPreference


def notify(user, title, body="", category=Notification.Category.SYSTEM, channel=Notification.Channel.IN_APP, link=""):
    """Create an in-app/notification record. Email/push dispatch hooks in here later
    (Django email backend for `email`, FCM/APNs via DeviceToken for `push`)."""
    if user is None:
        return None
    prefs = NotificationPreference.objects.filter(user=user).first()
    if prefs:
        if channel == Notification.Channel.PUSH and not prefs.push_enabled:
            return None
        if channel == Notification.Channel.EMAIL and not prefs.email_enabled:
            return None
        if category == Notification.Category.PROMOTION and not prefs.promotions:
            return None
        if category == Notification.Category.RECOMMENDATION and not prefs.recommendations:
            return None
    return Notification.objects.create(user=user, channel=channel, category=category, title=title, body=body, link=link)
