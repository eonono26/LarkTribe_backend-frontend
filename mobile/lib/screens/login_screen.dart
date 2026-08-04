import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

enum _LoginTab { password, phone }

class _LoginScreenState extends State<LoginScreen> {
  _LoginTab _tab = _LoginTab.password;
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();

  bool _otpSent = false;
  String? _debugCode;
  bool _loading = false;
  String? _error;

  Future<void> _passwordLogin() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final ok = await ApiService.instance.login(_usernameCtrl.text, _passwordCtrl.text);
    setState(() => _loading = false);
    if (ok && mounted) {
      Navigator.pop(context, true);
    } else {
      setState(() => _error = "Couldn't sign you in — check your username and password.");
    }
  }

  Future<void> _requestOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final code = await ApiService.instance.requestPhoneOTP(_phoneCtrl.text);
    setState(() {
      _loading = false;
      _otpSent = true;
      _debugCode = code;
    });
  }

  Future<void> _verifyOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final ok = await ApiService.instance.verifyPhoneOTP(_phoneCtrl.text, _codeCtrl.text);
    setState(() => _loading = false);
    if (ok && mounted) {
      Navigator.pop(context, true);
    } else {
      setState(() => _error = 'Invalid or expired code.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(color: AppColors.mist, borderRadius: BorderRadius.circular(999)),
              child: Row(
                children: [
                  Expanded(child: _tabButton('Email / username', _LoginTab.password)),
                  Expanded(child: _tabButton('Phone', _LoginTab.phone)),
                ],
              ),
            ),
            const SizedBox(height: 20),
            if (_tab == _LoginTab.password) ...[
              TextField(controller: _usernameCtrl, decoration: const InputDecoration(hintText: 'Username or email')),
              const SizedBox(height: 10),
              TextField(
                controller: _passwordCtrl,
                obscureText: true,
                decoration: const InputDecoration(hintText: 'Password'),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: AppColors.flag, fontSize: 13)),
              ],
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _loading ? null : _passwordLogin, child: Text(_loading ? 'Signing in…' : 'Sign in')),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
                child: const Text('New here? Create an account'),
              ),
            ] else ...[
              if (!_otpSent) ...[
                TextField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(hintText: '+254 7XX XXX XXX'),
                ),
                const SizedBox(height: 16),
                ElevatedButton(onPressed: _loading ? null : _requestOtp, child: Text(_loading ? 'Sending…' : 'Send code')),
              ] else ...[
                Text('Enter the 6-digit code sent to ${_phoneCtrl.text}.', style: const TextStyle(color: Colors.grey)),
                if (_debugCode != null) ...[
                  const SizedBox(height: 6),
                  Text('Dev mode code: $_debugCode', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
                const SizedBox(height: 10),
                TextField(
                  controller: _codeCtrl,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  decoration: const InputDecoration(hintText: '123456'),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Text(_error!, style: const TextStyle(color: AppColors.flag, fontSize: 13)),
                ],
                const SizedBox(height: 16),
                ElevatedButton(onPressed: _loading ? null : _verifyOtp, child: Text(_loading ? 'Verifying…' : 'Verify & sign in')),
              ],
            ],
            const SizedBox(height: 24),
            const Text('Or continue with', style: TextStyle(color: Colors.grey, fontSize: 12)),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: null, // TODO: wire google_sign_in package -> ApiService.instance.socialLogin('google', idToken)
              icon: const Icon(Icons.g_mobiledata),
              label: const Text('Continue with Google'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: null, // TODO: wire sign_in_with_apple package -> ApiService.instance.socialLogin('apple', idToken)
              icon: const Icon(Icons.apple),
              label: const Text('Continue with Apple'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tabButton(String label, _LoginTab tab) {
    final selected = _tab == tab;
    return GestureDetector(
      onTap: () => setState(() => _tab = tab),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected ? AppColors.ink : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(color: selected ? Colors.white : Colors.grey[600], fontWeight: FontWeight.w700, fontSize: 12),
        ),
      ),
    );
  }
}
