package com.example.agendaplus

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.agendaplus.databinding.ItemDashboardCardBinding

class DashboardAdapter(private var items: List<AgendaItem>) : RecyclerView.Adapter<DashboardAdapter.ViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemDashboardCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    fun updateData(newItems: List<AgendaItem>) {
        items = newItems
        notifyDataSetChanged()
    }

    inner class ViewHolder(private val binding: ItemDashboardCardBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: AgendaItem) {
            binding.tvTitle.text = item.title
            binding.tvDescription.text = item.description
            binding.tvTime.text = item.time
        }
    }
}
