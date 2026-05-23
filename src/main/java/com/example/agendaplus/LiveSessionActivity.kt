package com.example.agendaplus

import android.content.Intent
import androidx.core.net.toUri
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.agendaplus.databinding.ActivityLiveSessionBinding

class LiveSessionActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLiveSessionBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLiveSessionBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnBack.setOnClickListener {
            onBackPressed()
        }

        binding.btnJoinMeeting.setOnClickListener {
            val url = binding.etMeetingUrl.text.toString()
            if (url.isNotEmpty()) {
                val intent = Intent(Intent.ACTION_VIEW, url.toUri())
                startActivity(intent)
            } else {
                Toast.makeText(this, getString(R.string.please_enter_meeting_url), Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnZoom.setOnClickListener {
            val intent = packageManager.getLaunchIntentForPackage("us.zoom.videomeetings")
            if (intent != null) {
                startActivity(intent)
            } else {
                val webIntent = Intent(Intent.ACTION_VIEW, "https://zoom.us/".toUri())
                startActivity(webIntent)
            }
        }

        binding.btnSkype.setOnClickListener {
            val intent = packageManager.getLaunchIntentForPackage("com.skype.raider")
            if (intent != null) {
                startActivity(intent)
            } else {
                val webIntent = Intent(Intent.ACTION_VIEW, "https://www.skype.com/".toUri())
                startActivity(webIntent)
            }
        }

        binding.btnFacebook.setOnClickListener {
            val intent = packageManager.getLaunchIntentForPackage("com.facebook.orca")
            if (intent != null) {
                startActivity(intent)
            } else {
                val webIntent = Intent(Intent.ACTION_VIEW, "https://www.messenger.com/".toUri())
                startActivity(webIntent)
            }
        }

        binding.btnGoogleMeet.setOnClickListener {
            val intent = packageManager.getLaunchIntentForPackage("com.google.android.apps.meetings")
            if (intent != null) {
                startActivity(intent)
            } else {
                val webIntent = Intent(Intent.ACTION_VIEW, "https://meet.google.com/".toUri())
                startActivity(webIntent)
            }
        }
    }
}
