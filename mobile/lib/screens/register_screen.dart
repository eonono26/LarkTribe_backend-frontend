import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _usernameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();

  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final error = await ApiService.instance.register(
      username: _usernameCtrl.text,
      email: _emailCtrl.text,
      password: _passwordCtrl.text,
      firstName: _firstNameCtrl.text,
      lastName: _lastNameCtrl.text,
      phone: _phoneCtrl.text,
    );
    setState(() => _loading = false);
    if (error == null && mounted) {
      Navigator.pop(context, true);
    } else {
      setState(() => _error = error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(child: TextField(controller: _firstNameCtrl, decoration: const InputDecoration(hintText: 'First name'))),
                const SizedBox(width: 10),
                Expanded(child: TextField(controller: _lastNameCtrl, decoration: const InputDecoration(hintText: 'Last name'))),
              ],
            ),
            const SizedBox(height: 10),
            TextField(controller: _usernameCtrl, decoration: const InputDecoration(hintText: 'Username')),
            const SizedBox(height: 10),
            TextField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(hintText: 'Email'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(hintText: 'Phone (for M-Pesa & delivery updates)'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _passwordCtrl,
              obscureText: true,
              decoration: const InputDecoration(hintText: 'Password'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: AppColors.flag, fontSize: 13)),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.signal, foregroundColor: AppColors.ink),
              onPressed: _loading ? null : _submit,
              child: Text(_loading ? 'Creating account…' : 'Create account'),
            ),
          ],
        ),
      ),
    );
  }
}
