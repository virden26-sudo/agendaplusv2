package com.example.agendaplus

import android.os.Parcel
import android.os.Parcelable

enum class ItemType : Parcelable {
    ASSIGNMENT, TASK, GRADE, EVENT, STUDY, LIVE;

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeInt(ordinal)
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : Parcelable.Creator<ItemType> {
        override fun createFromParcel(parcel: Parcel): ItemType {
            val ordinal = parcel.readInt()
            return ItemType.values()[ordinal]
        }

        override fun newArray(size: Int): Array<ItemType?> {
            return arrayOfNulls(size)
        }
    }
}

data class AgendaItem(
    var id: Long,
    val title: String,
    val description: String,
    val time: String, // Or grade value, or due date
    val type: ItemType
) : Parcelable {
    constructor(parcel: Parcel) : this(
        parcel.readLong(),
        parcel.readString()!!,
        parcel.readString()!!,
        parcel.readString()!!,
        ItemType.values()[parcel.readInt()]
    )

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeLong(id)
        parcel.writeString(title)
        parcel.writeString(description)
        parcel.writeString(time)
        parcel.writeInt(type.ordinal)
    }

    override fun describeContents(): Int {
        return 0
    }

    companion object CREATOR : Parcelable.Creator<AgendaItem> {
        override fun createFromParcel(parcel: Parcel): AgendaItem {
            return AgendaItem(parcel)
        }

        override fun newArray(size: Int): Array<AgendaItem?> {
            return arrayOfNulls(size)
        }
    }
}