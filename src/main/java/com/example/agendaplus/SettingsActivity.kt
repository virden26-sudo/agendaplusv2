package com.example.agendaplus

import android.content.Intent
import androidx.core.net.toUri
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.work.WorkManager
import com.example.agendaplus.databinding.ActivitySettingsBinding

class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnSyncPortal.setOnClickListener {
            val prefs = getSharedPreferences(getString(R.string.agenda_prefs), MODE_PRIVATE)
            val portalUrl = prefs.getString("portal_url_1", null)
            if (!portalUrl.isNullOrEmpty()) {
                val intent = Intent(Intent.ACTION_VIEW, portalUrl.toUri())
                startActivity(intent)
            } else {
                Toast.makeText(this, getString(R.string.portal_url_not_set), Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnResetProfile.setOnClickListener {
            val prefs = getSharedPreferences(getString(R.string.agenda_prefs), MODE_PRIVATE)
            prefs.edit().clear().apply()
            WorkManager.getInstance(applicationContext).cancelAllWork()
            val packageManager = packageManager
            val intent = packageManager.getLaunchIntentForPackage(packageName)
            val componentName = intent!!.component
            val mainIntent = Intent.makeRestartActivityTask(componentName)
            startActivity(mainIntent)
            System.exit(0)
        }

        binding.btnUpgrade.setOnClickListener {
            Toast.makeText(this, getString(R.string.coming_soon), Toast.LENGTH_SHORT).show()
        }

        binding.btnExit.setOnClickListener {
            finishAffinity()
        }
    }
}
