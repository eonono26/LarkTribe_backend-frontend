from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Address, PaymentMethod

admin.site.register(User, UserAdmin)
admin.site.register(Address)
admin.site.register(PaymentMethod)
