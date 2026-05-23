package com.example.agendaplus

import android.annotation.SuppressLint
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.agendaplus.databinding.ItemAgendaBinding
import com.example.agendaplus.databinding.ItemDashboardCardBinding
import com.example.agendaplus.databinding.ItemEmptyStateBinding

class AgendaAdapter(
    private var items: List<AgendaItem>,
    private var isDashboard: Boolean,
    private val onSyncClicked: () -> Unit,
    private val onDashboardCardClicked: (ItemType) -> Unit
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private companion object {
        const val VIEW_TYPE_DASHBOARD_CARDS = 0
        const val VIEW_TYPE_ITEM = 1
        const val VIEW_TYPE_EMPTY = 2
    }

    class ItemViewHolder(val binding: ItemAgendaBinding) : RecyclerView.ViewHolder(binding.root)

    class EmptyViewHolder(val binding: ItemEmptyStateBinding) : RecyclerView.ViewHolder(binding.root)

    class DashboardCardViewHolder(val binding: ItemDashboardCardBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return when (viewType) {
            VIEW_TYPE_DASHBOARD_CARDS -> {
                val binding = ItemDashboardCardBinding.inflate(
                    LayoutInflater.from(parent.context),
                    parent,
                    false
                )
                DashboardCardViewHolder(binding)
            }
            VIEW_TYPE_EMPTY -> {
                val binding = ItemEmptyStateBinding.inflate(
                    LayoutInflater.from(parent.context),
                    parent,
                    false
                )
                EmptyViewHolder(binding)
            }
            else -> {
                val binding = ItemAgendaBinding.inflate(
                    LayoutInflater.from(parent.context),
                    parent,
                    false
                )
                ItemViewHolder(binding)
            }
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (holder) {
            is DashboardCardViewHolder -> {
                val type = ItemType.entries[position]
                val count = items.count { it.type == type }
                val context = holder.itemView.context

                holder.binding.tvTitle.text = type.name
                holder.binding.tvDescription.text = context.getString(R.string.item_count_format, count)
                holder.itemView.setOnClickListener { onDashboardCardClicked(type) }

                when (type) {
                    ItemType.ASSIGNMENT -> {
                        holder.binding.imgCardIcon.setImageResource(R.drawable.ic_book_open_page_variant)
                    }
                    ItemType.TASK -> {
                        holder.binding.imgCardIcon.setImageResource(R.drawable.ic_book_check_outline)
                    }
                    ItemType.GRADE -> {
                        holder.binding.imgCardIcon.setImageResource(android.R.drawable.star_off)
                    }
                    ItemType.EVENT -> {
                        holder.binding.imgCardIcon.setImageResource(android.R.drawable.ic_menu_my_calendar)
                    }
                    ItemType.STUDY -> {
                        holder.binding.imgCardIcon.setImageResource(android.R.drawable.ic_menu_search)
                    }
                    ItemType.LIVE -> {
                        holder.binding.imgCardIcon.setImageResource(android.R.drawable.ic_menu_camera)
                    }
                }
            }
            is ItemViewHolder -> {
                val item = items[position]
                holder.binding.textTitle.text = item.title
                holder.binding.textTime.text = item.time
                holder.binding.textDescription.text = item.description
            }
            is EmptyViewHolder -> {
                holder.binding.btnEmptyStateSync.setOnClickListener { onSyncClicked() }

                holder.binding.textCardTitle.text = ""
                holder.binding.textCardSubtitle.text = ""
                holder.binding.textEmptyTitle.text = ""
            }
        }
    }

    override fun getItemCount(): Int {
        return if (isDashboard) {
            ItemType.entries.size
        } else {
            if (items.isEmpty()) 1 else items.size
        }
    }

    override fun getItemViewType(position: Int): Int {
        return if (isDashboard) {
            VIEW_TYPE_DASHBOARD_CARDS
        } else {
            if (items.isEmpty()) VIEW_TYPE_EMPTY else VIEW_TYPE_ITEM
        }
    }

    @SuppressLint("NotifyDataSetChanged")
    fun updateData(newItems: List<AgendaItem>, isDashboard: Boolean) {
        this.items = newItems
        this.isDashboard = isDashboard
        notifyDataSetChanged()
    }
}
